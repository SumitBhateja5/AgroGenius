$(function () {
  $("#getWeatherBtn").on("click", function () {
    var city = $("#cityInput").val().trim();
    var cropType = $("#cropSelect").val();

    if (!city) {
      $("#weatherError").text("Please enter a city name.").show();
      return;
    }

    $("#weatherError").hide();
    $("#weatherResult").hide();
    $("#loadingWeather").show();
    $("#getWeatherBtn").prop("disabled", true);

    $.ajax({
      type: "POST",
      url: "/api/weather",
      contentType: "application/json",
      data: JSON.stringify({ city: city, crop_type: cropType }),
      success: function (response) {
        $("#loadingWeather").hide();
        $("#getWeatherBtn").prop("disabled", false);

        if (response.error) {
          $("#weatherError").text(response.error).show();
          return;
        }

        var weather = response.weather;
        $("#cityName").text(weather.city);
        $("#temperature").text(weather.temp + "°C");
        $("#weatherDesc").text(weather.description);
        $("#humidity").text(weather.humidity + "%");
        $("#windSpeed").text(weather.wind_speed + " m/s");
        $("#weatherIcon").attr(
          "src",
          "https://openweathermap.org/img/wn/" + weather.icon + "@2x.png"
        );
        $("#farmingAdvice").html(formatMarkdown(response.advice));
        $("#weatherResult").show();
      },
      error: function (xhr) {
        $("#loadingWeather").hide();
        $("#getWeatherBtn").prop("disabled", false);
        $("#weatherError")
          .text("Error fetching weather data. Please try again.")
          .show();
      },
    });
  });

  $("#cityInput").on("keypress", function (e) {
    if (e.which == 13) $("#getWeatherBtn").click();
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
