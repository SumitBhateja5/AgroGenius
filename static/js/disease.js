$(function () {
  var selectedFile = null;

  // Click on upload area to trigger file input
  $("#uploadArea").on("click", function (e) {
    if (e.target === this || $(e.target).closest(".upload-content").length) {
      e.stopPropagation();
      $("#diseaseImageInput").trigger("click");
    }
  });

  $("#uploadArea").on("dragover", function (e) {
    e.preventDefault();
    e.stopPropagation();
    $(this).css("background", "#e8f5e9");
  });

  $("#uploadArea").on("dragleave", function (e) {
    e.preventDefault();
    e.stopPropagation();
    $(this).css("background", "transparent");
  });

  $("#uploadArea").on("drop", function (e) {
    e.preventDefault();
    e.stopPropagation();
    $(this).css("background", "transparent");
    var file = e.originalEvent.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleFile(file);
    }
  });

  $("#diseaseImageInput").on("change", function (e) {
    var file = e.target.files[0];
    if (file) handleFile(file);
  });

  function handleFile(file) {
    selectedFile = file;
    var reader = new FileReader();
    reader.onload = function (e) {
      $("#previewImage").attr("src", e.target.result);
      $("#imagePreviewArea").show();
      $("#uploadArea").hide();
      $("#analyzeBtn").show();
    };
    reader.readAsDataURL(file);
  }

  $("#removeImageBtn").on("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    selectedFile = null;
    $("#diseaseImageInput").val("");
    $("#imagePreviewArea").hide();
    $("#uploadArea").show();
    $("#analyzeBtn").hide();
    $("#diagnosisResult").hide();
  });

  $("#analyzeBtn").on("click", function () {
    if (!selectedFile) return;

    $("#diseaseError").hide();
    $("#diagnosisResult").hide();
    $("#loadingDisease").show();
    $("#analyzeBtn").prop("disabled", true);

    var formData = new FormData();
    formData.append("image", selectedFile);

    $.ajax({
      type: "POST",
      url: "/api/disease",
      data: formData,
      processData: false,
      contentType: false,
      success: function (response) {
        $("#loadingDisease").hide();
        $("#analyzeBtn").prop("disabled", false);

        if (response.error) {
          $("#diseaseError").text(response.error).show();
          return;
        }

        $("#diagnosisContent").html(formatMarkdown(response.diagnosis));
        $("#diagnosisResult").show();
      },
      error: function () {
        $("#loadingDisease").hide();
        $("#analyzeBtn").prop("disabled", false);
        $("#diseaseError")
          .text("Error analyzing image. Please try again.")
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
      .replace(/^\- (.*$)/gm, "<li>$1</li>")
      .replace(/^\d+\. (.*$)/gm, "<li>$1</li>")
      .replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>")
      .replace(/\n/g, "<br>");
  }
});
