$(function () {
  $("#calculateBtn").on("click", function () {
    var cropType = $("#cropType").val().trim();
    var area = $("#areaInput").val().trim();
    var areaUnit = $("#areaUnit").val();
    var soilType = $("#soilType").val();
    var growthStage = $("#growthStage").val();

    if (!cropType || !area) {
      $("#calcError").text("Please fill in crop type and area.").show();
      return;
    }

    $("#calcError").hide();
    $("#calcResult").hide();
    $("#loadingCalc").show();
    $("#calculateBtn").prop("disabled", true);

    $.ajax({
      type: "POST",
      url: "/api/calculate",
      contentType: "application/json",
      data: JSON.stringify({
        crop_type: cropType,
        area: area,
        area_unit: areaUnit,
        soil_type: soilType,
        growth_stage: growthStage,
      }),
      success: function (response) {
        $("#loadingCalc").hide();
        $("#calculateBtn").prop("disabled", false);

        if (response.error) {
          $("#calcError").text(response.error).show();
          return;
        }

        $("#calcContent").html(formatMarkdown(response.result));
        $("#calcResult").show();
      },
      error: function () {
        $("#loadingCalc").hide();
        $("#calculateBtn").prop("disabled", false);
        $("#calcError")
          .text("Error calculating resources. Please try again.")
          .show();
      },
    });
  });

  function formatMarkdown(text) {
    if (!text) return "";
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/^### (.*$)/gm, "<h4>$1</h4>")
      .replace(/^## (.*$)/gm, "<h3>$1</h3>")
      .replace(/^# (.*$)/gm, "<h2>$1</h2>")
      .replace(/^\- (.*$)/gm, "• $1")
      .replace(/^\d+\. (.*$)/gm, "<li>$1</li>")
      .replace(/\n/g, "<br>");
  }
});
